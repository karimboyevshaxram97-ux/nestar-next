import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import useDeviceDetect from '../../libs/hooks/useDeviceDetect';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import { Button, Stack, Typography, Tab, Tabs, IconButton, Backdrop, Pagination } from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import Moment from 'react-moment';
import { userVar } from '../../apollo/store';
import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ChatIcon from '@mui/icons-material/Chat';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import { CommentInput, CommentsInquiry } from '../../libs/types/comment/comment.input';
import { Comment } from '../../libs/types/comment/comment';
import dynamic from 'next/dynamic';
import { CommentGroup, CommentStatus } from '../../libs/enums/comment.enum';
import { T } from '../../libs/types/common';
import EditIcon from '@mui/icons-material/Edit';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { BoardArticle } from '../../libs/types/board-article/board-article';
import { GET_COMMENTS } from '../../apollo/user/query';
import { CREATE_COMMENT, LIKE_TARGET_BOARD_ARTICLE, UPDATE_COMMENT } from '../../apollo/user/mutation';
import { GET_BOARD_ARTICLE } from '../../apollo/user/query';
import { Messages, REACT_APP_API_URL } from '../../libs/config';
import { sweetConfirmAlert, sweetMixinErrorAlert, sweetMixinSuccessAlert, sweetTopSmallSuccessAlert } from '../../libs/sweetAlert';
import { CommentUpdate } from '../../libs/types/comment/comment.update';
const ToastViewerComponent = dynamic(() => import('../../libs/components/community/TViewer'), { ssr: false });

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common'])),
	},
});

const CommunityDetail: NextPage = ({ initialInput, ...props }: T) => {
	const device = useDeviceDetect();
	const router = useRouter();
	const { query } = router;

	const articleId = query?.id as string;
	const articleCategory = query?.articleCategory as string;

	const [comment, setComment] = useState<string>('');
	const [wordsCnt, setWordsCnt] = useState<number>(0);
	const [updatedCommentWordsCnt, setUpdatedCommentWordsCnt] = useState<number>(0);
	const user = useReactiveVar(userVar);
	const [comments, setComments] = useState<Comment[]>([]);
	const [total, setTotal] = useState<number>(0);
	const [searchFilter, setSearchFilter] = useState<CommentsInquiry>({
		...initialInput,
	});
	const [memberImage, setMemberImage] = useState<string>('/img/community/articleImg.png');
	const [anchorEl, setAnchorEl] = useState<any | null>(null);
	const open = Boolean(anchorEl);
	const id = open ? 'simple-popover' : undefined;
	const [openBackdrop, setOpenBackdrop] = useState<boolean>(false);
	const [updatedComment, setUpdatedComment] = useState<string>('');
	const [updatedCommentId, setUpdatedCommentId] = useState<string>('');
	const [likeLoading, setLikeLoading] = useState<boolean>(false);
	const [boardArticle, setBoardArticle] = useState<BoardArticle>();

    	/** APOLLO SO'ROVLAR **/
    const [likeTargetBoardArticle] = useMutation(LIKE_TARGET_BOARD_ARTICLE);
    const [createComment] = useMutation(CREATE_COMMENT);
    const [updateComment] = useMutation(UPDATE_COMMENT);
    
    const {
      loading: boardArticleLoading,   // ⏳ Maqola yuklanish jarayoni
      data: boardArticleData,         // 📦 Olingan maqola ma'lumotlari
      error: getBoardArticleError,    // ⚠️ Xatolik bo'lsa
      refetch: boardArticleRefetch,   // 🔄 Qayta so'rov yuborish
    } = useQuery(GET_BOARD_ARTICLE, {
      fetchPolicy: 'network-only',    // 🌐 Faqat tarmoqdan ma'lumot olish
      variables: {
        input: articleId,             // 🔍 Maqola ID bilan so'rov
      },
      notifyOnNetworkStatusChange: true, // 🔔 Tarmoq holati o'zgarsa xabar berish
      onCompleted(data: any) {
        setBoardArticle(data?.getBoardArticle); // 📋 Maqola ma'lumotini o'rnatish
        if (data?.getBoardArticle?.memberData?.memberImage) {
          setMemberImage(`${REACT_APP_API_URL}/${data?.getBoardArticle?.memberData?.memberImage}`);
        }
      },
    });
    
    const {
      loading: getCommentsLoading,   // ⏳ Kommentlar yuklanish jarayoni
      data: getCommentsData,         // 📦 Olingan kommentlar ma'lumotlari
      error: getCommentsError,       // ⚠️ Xatolik bo'lsa
      refetch: getCommentsRefetch,   // 🔄 Qayta so'rov yuborish
    } = useQuery(GET_COMMENTS, {
      fetchPolicy: 'network-only',
      variables: { input: searchFilter },
      skip: !searchFilter.search.commentRefId,
      notifyOnNetworkStatusChange: true,
      onCompleted(data: any) {
        setComments(data.getComments.list); // 📋 Kommentlar ro'yxatini o'rnatish
        setTotal(data.getComments?.metaCounter?.[0]?.total || 0); // 🔢 Umumiy sonini o'rnatish
      },
    });
    

	/** LIFECYCLES **/
	useEffect(() => {
		if (articleId) setSearchFilter({ ...searchFilter, search: { commentRefId: articleId } });
	}, [articleId]);

	/** HANDLERS **/
	const tabChangeHandler = (event: React.SyntheticEvent, value: string) => {
		router.replace(
			{
				pathname: '/community',
				query: { articleCategory: value },
			},
			'/community',
			{ shallow: true },
		);
	};

    	const likeBoardArticleHandler = async (user: any, id: any) => {
      try {
        if (likeLoading) return;                                       // ⏳ Agar likeLoading true bo'lsa, qayta ishlamaslik
        if (!id) return;                                               // ❗ Agar id bo'lmasa, funksiyani to'xtatish
        if (!user?._id) throw new Error(Messages.error2);
        setLikeLoading(true);                                          // 🔄 Like jarayonini boshlash (loading = true)
    
        await likeTargetBoardArticle({
          variables: {
            input: id,                                                 // 🖱️ Like bosilgan article ID yuborish
          },
        });
        await boardArticleRefetch({ input: articleId });               // 🔄 Maqolani qayta so'rov qilish
        await sweetTopSmallSuccessAlert('success', 800);               // ✅ Muvaffaqiyatli alert ko'rsatish
      } catch (err: any) {
        console.log('XATO_LikeBoArticleHandler', err.message);         // 🖥️ Konsolda xatoni chiqarish
        sweetMixinErrorAlert(err.message).then();                      // ⚠️ Xato alert ko'rsatish
      } finally {
        setLikeLoading(false);                                         // 🔄 Jarayon tugagach loading'ni false qilish
      }
    };
    
    const creteCommentHandler = async () => {
      if (!comment) return;                                            // ❗ Agar komment bo'lmasa, funksiyani to'xtatish
      try {
        if (!user?._id) throw new Error(Messages.error2);              // ❗ Agar user._id bo'lmasa, xato chiqarish
    
        const commentInput: CommentInput = {
          commentGroup: CommentGroup.ARTICLE,                          // 📝 Komment ARTICLE guruhiga tegishli
          commentRefId: articleId,                                     // 🔗 Komment qaysi article'ga tegishli
          commentContent: comment,                                     // 📋 Komment matni
        };
    
        await createComment({
          variables: {
            input: commentInput,                                       // 📝 Komment ma'lumotlarini yuborish
          },
        });
        await getCommentsRefetch({ input: searchFilter });             // 🔄 Kommentlarni qayta so'rov qilish
        await boardArticleRefetch({ input: articleId });               // 🔄 Maqolani qayta so'rov qilish
        setComment('');                                                // 🧹 Komment inputni tozalash
        await sweetMixinSuccessAlert('Successfully commented!');       // ✅ Muvaffaqiyatli alert ko'rsatish
      } catch (error: any) {
        await sweetMixinErrorAlert(error.message);                     // ⚠️ Xato alert ko'rsatish
      }
    };
    
    
    	const updateButtonHandler = async (commentId: string, commentStatus?: CommentStatus.DELETE) => {
      try {
      if (!user?._id) throw new Error(Messages.error2);
      if (!commentId) throw new Error('Select a comment to update!');             // ❗ Komment ID tanlanmagan bo'lsa, xato chiqarish
      if (!updatedComment && !comments.find(c => c?._id === commentId)?.commentContent) return; 
                                                                                 // ❗ Agar yangilanish matni ham, eski komment matni ham bo'lmasa, to'xtatish
    
      const updateData: CommentUpdate = {
        _id: commentId,                                                           // 🔗 Komment ID
        ...(commentStatus && { commentStatus: commentStatus }),                   // 🗑️ Agar status DELETE bo'lsa, o'chirish
        ...(updatedComment && { commentContent: updatedComment }),                // ✏️ Agar yangi matn bo'lsa, yangilash
      };
    
      if (!updateData?.commentContent && !updateData?.commentStatus)
        throw new Error('Provide data to update your comment!');                  // ❗ Agar yangilash uchun ma'lumot bo'lmasa, xato chiqarish
    
      if (commentStatus) {
        if (await sweetConfirmAlert('Do you want to delete the comment?')) {      // 🔔 O'chirishni tasdiqlash alerti
          await updateComment({ variables: { input: updateData } });              // 🗑️ Kommentni o'chirish
          await sweetMixinSuccessAlert('Successfully deleted!');                  // ✅ O'chirildi alerti
        } else return;                                                            // ❌ Agar tasdiqlanmasa, to'xtatish
      } else {
        await updateComment({ variables: { input: updateData } });                // ✏️ Kommentni yangilash
        await sweetMixinSuccessAlert('Successfully updated!');                    // ✅ Yangilandi alerti
      }
    
      await getCommentsRefetch({ input: searchFilter });
    } catch (error: any) {
      await sweetMixinErrorAlert(error.message);
    } finally {
      setOpenBackdrop(false);
      setUpdatedCommentWordsCnt(0);
      setUpdatedCommentId('');
    }
    };


	const getCommentMemberImage = (imageUrl: string | undefined) => {
		if (imageUrl) return `${REACT_APP_API_URL}/${imageUrl}`;
		else return '/img/community/articleImg.png';
	};

	const goMemberPage = (id: any) => {
		if (id === user?._id) router.push('/mypage');
		else router.push(`/member?memberId=${id}`);
	};

	const cancelButtonHandler = () => {
		setOpenBackdrop(false);
		setUpdatedComment('');
		setUpdatedCommentWordsCnt(0);
	};

	const updateCommentInputHandler = (value: string) => {
		if (value.length > 100) return;
		setUpdatedCommentWordsCnt(value.length);
		setUpdatedComment(value);
	};

	const paginationHandler = (e: T, value: number) => {
		setSearchFilter({ ...searchFilter, page: value });
	};

	if (device === 'mobile') {
		return <div>COMMUNITY DETAIL PAGE MOBILE</div>;
	} else {
		return (
			<div id="community-detail-page">
				<div className="container">
					<Stack className="main-box">
						<Stack className="left-config">
							<Stack className={'image-info'}>
								<img src={'/img/logo/logoText.svg'} />
								<Stack className={'community-name'}>
									<Typography className={'name'}>Community Board Article</Typography>
								</Stack>
							</Stack>
							<Tabs
								orientation="vertical"
								aria-label="lab API tabs example"
								TabIndicatorProps={{
									style: { display: 'none' },
								}}
								onChange={tabChangeHandler}
								value={articleCategory}
							>
								<Tab
									value={'FREE'}
									label={'Free Board'}
									className={`tab-button ${articleCategory === 'FREE' ? 'active' : ''}`}
								/>
								<Tab
									value={'RECOMMEND'}
									label={'Recommendation'}
									className={`tab-button ${articleCategory === 'RECOMMEND' ? 'active' : ''}`}
								/>
								<Tab
									value={'NEWS'}
									label={'News'}
									className={`tab-button ${articleCategory === 'NEWS' ? 'active' : ''}`}
								/>
								<Tab
									value={'HUMOR'}
									label={'Humor'}
									className={`tab-button ${articleCategory === 'HUMOR' ? 'active' : ''}`}
								/>
							</Tabs>
						</Stack>
						<div className="community-detail-config">
							<Stack className="title-box">
								<Stack className="left">
									<Typography className="title">{articleCategory} BOARD</Typography>
									<Typography className="sub-title">
										Express your opinions freely here without content restrictions
									</Typography>
								</Stack>
								<Button
									onClick={() =>
										router.push({
											pathname: '/mypage',
											query: {
												category: 'writeArticle',
											},
										})
									}
									className="right"
								>
									Write
								</Button>
							</Stack>
							<div className="config">
								<Stack className="first-box-config">
									<Stack className="content-and-info">
										<Stack className="content">
											<Typography className="content-data">{boardArticle?.articleTitle}</Typography>
											<Stack className="member-info">
												<img
													src={memberImage}
													alt=""
													className="member-img"
													onClick={() => goMemberPage(boardArticle?.memberData?._id)}
												/>
												<Typography className="member-nick" onClick={() => goMemberPage(boardArticle?.memberData?._id)}>
													{boardArticle?.memberData?.memberNick}
												</Typography>
												<Stack className="divider"></Stack>
												<Moment className={'time-added'} format={'DD.MM.YY HH:mm'}>
													{boardArticle?.createdAt}
												</Moment>
											</Stack>
										</Stack>
										<Stack className="info">
											<Stack className="icon-info">
												{boardArticle?.meLiked && boardArticle?.meLiked[0]?.myFavorite ? ( 
                                                  <ThumbUpAltIcon 
                                                    onClick={() => likeBoardArticleHandler(user, boardArticle?._id)} />       // 👍 Agar user oldin like qilgan bo'lsa, to'liq ThumbUpIcon ko'rsatish
                                                ) : (
                                                  <ThumbUpOffAltIcon 
                                                    onClick={() => likeBoardArticleHandler(user, boardArticle?._id)} />       // 👎 Agar user like qilmagan bo'lsa, bo'sh ThumbUpIcon ko'rsatish
                                                )}


												<Typography className="text">{boardArticle?.articleLikes}</Typography>
											</Stack>
											<Stack className="divider"></Stack>
											<Stack className="icon-info">
												<VisibilityIcon />
												<Typography className="text">{boardArticle?.articleViews}</Typography>
											</Stack>
											<Stack className="divider"></Stack>
											<Stack className="icon-info">
                                              {total > 0 ? ( 
                                                <ChatIcon />                                                     // 💬 Agar total > 0 bo'lsa, to'liq chat ikonka ko'rsatish
                                              ) : ( 
                                                <ChatBubbleOutlineRoundedIcon />                                 // 💭 Agar total = 0 bo'lsa, bo'sh chat ikonka ko'rsatish
                                              )}
                                              <Typography className="text">{total}</Typography>
                                            </Stack>

										</Stack>
									</Stack>
									<Stack>
										<ToastViewerComponent markdown={boardArticle?.articleContent} className={'ytb_play'} />
									</Stack>
									<Stack className="like-and-dislike">
										<Stack className="top">
											<Button>
                                          {boardArticle?.meLiked && boardArticle?.meLiked[0]?.myFavorite ? ( 
                                            <ThumbUpAltIcon 
                                              onClick={() => likeBoardArticleHandler(user, boardArticle?._id)} />     // 👍 Agar user oldin like qilgan bo'lsa, to'liq ThumbUpIcon ko'rsatish
                                          ) : (
                                            <ThumbUpOffAltIcon 
                                              onClick={() => likeBoardArticleHandler(user, boardArticle?._id)} />     // 👎 Agar user like qilmagan bo'lsa, bo'sh ThumbUpIcon ko'rsatish
                                          )}
                                          <Typography className="text">{boardArticle?.articleLikes}</Typography>
                                        </Button>

										</Stack>
									</Stack>
								</Stack>
								<Stack
									className="second-box-config"
									sx={{ borderBottom: total > 0 ? 'none' : '1px solid #eee', border: '1px solid #eee' }}
								>
									<Typography className="title-text">Comments ({total})</Typography>
									<Stack className="leave-comment">
										<input
											type="text"
											placeholder="Leave a comment"
											value={comment}
											onChange={(e) => {
												if (e.target.value.length > 100) return;
												setWordsCnt(e.target.value.length);
												setComment(e.target.value);
											}}
										/>
										<Stack className="button-box">
											<Typography>{wordsCnt}/100</Typography>
											<Button onClick={creteCommentHandler}>comment</Button>
										</Stack>
									</Stack>
								</Stack>
								{total > 0 && (
									<Stack className="comments">
										<Typography className="comments-title">Comments</Typography>
									</Stack>
								)}
								{comments?.map((commentData, index) => {
									return (
										<Stack className="comments-box" key={commentData?._id}>
											<Stack className="main-comment">
												<Stack className="member-info">
													<Stack
														className="name-date"
														onClick={() => goMemberPage(commentData?.memberData?._id as string)}
													>
														<img src={getCommentMemberImage(commentData?.memberData?.memberImage)} alt="" />
														<Stack className="name-date-column">
															<Typography className="name">{commentData?.memberData?.memberNick}</Typography>
															<Typography className="date">
																<Moment className={'time-added'} format={'DD.MM.YY HH:mm'}>
																	{commentData?.createdAt}
																</Moment>
															</Typography>
														</Stack>
													</Stack>
													{commentData?.memberId === user?._id && (
														<Stack className="buttons">
															<IconButton
																onClick={() => {
																	setUpdatedCommentId(commentData?._id);
																	updateButtonHandler(commentData?._id, CommentStatus.DELETE);
																}}
															>
																<DeleteForeverIcon sx={{ color: '#757575', cursor: 'pointer' }} />
															</IconButton>
															<IconButton
																onClick={() => {
																	setUpdatedComment(commentData?.commentContent);
																	setUpdatedCommentWordsCnt(commentData?.commentContent?.length);
																	setUpdatedCommentId(commentData?._id);
																	setOpenBackdrop(true);
																}}
															>
																<EditIcon sx={{ color: '#757575' }} />
															</IconButton>
															<Backdrop
																sx={{
																	top: '40%',
																	right: '25%',
																	left: '25%',
																	width: '1000px',
																	height: 'fit-content',
																	borderRadius: '10px',
																	color: '#ffffff',
																	zIndex: 999,
																}}
																open={openBackdrop}
															>
																<Stack
																	sx={{
																		width: '100%',
																		height: '100%',
																		background: 'white',
																		border: '1px solid #b9b9b9',
																		padding: '15px',
																		gap: '10px',
																		borderRadius: '10px',
																		boxShadow: 'rgba(99, 99, 99, 0.2) 0px 2px 8px 0px',
																	}}
																>
																	<Typography variant="h4" color={'#b9b9b9'}>
																		Update comment
																	</Typography>
																	<Stack gap={'20px'}>
																		<input
																			autoFocus
																			value={updatedComment}
																			onChange={(e) => updateCommentInputHandler(e.target.value)}
																			type="text"
																			style={{
																				border: '1px solid #b9b9b9',
																				outline: 'none',
																				height: '40px',
																				padding: '0px 10px',
																				borderRadius: '5px',
																			}}
																		/>
																		<Stack width={'100%'} flexDirection={'row'} justifyContent={'space-between'}>
																			<Typography variant="subtitle1" color={'#b9b9b9'}>
																				{updatedCommentWordsCnt}/100
																			</Typography>
																			<Stack sx={{ flexDirection: 'row', alignSelf: 'flex-end', gap: '10px' }}>
																				<Button
																					variant="outlined"
																					color="inherit"
																					onClick={() => cancelButtonHandler()}
																				>
																					Cancel
																				</Button>
																				<Button
																					variant="contained"
																					color="inherit"
																					onClick={() => updateButtonHandler(updatedCommentId, undefined)}
																				>
																					Update
																				</Button>
																			</Stack>
																		</Stack>
																	</Stack>
																</Stack>
															</Backdrop>
														</Stack>
													)}
												</Stack>
												<Stack className="content">
													<Typography>{commentData?.commentContent}</Typography>
												</Stack>
											</Stack>
										</Stack>
									);
								})}
								{total > 0 && (
									<Stack className="pagination-box">
										<Pagination
											count={Math.ceil(total / searchFilter.limit) || 1}
											page={searchFilter.page}
											shape="circular"
											color="primary"
											onChange={paginationHandler}
										/>
									</Stack>
								)}
							</div>
						</div>
					</Stack>
				</div>
			</div>
		);
	}
};
CommunityDetail.defaultProps = {
	initialInput: {
		page: 1,
		limit: 5,
		sort: 'createdAt',
		direction: 'DESC',
		search: { commentRefId: '' },
	},
};

export default withLayoutBasic(CommunityDetail);
