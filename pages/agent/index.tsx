import React, { ChangeEvent, MouseEvent, useEffect, useState } from 'react';
import { NextPage } from 'next';
import useDeviceDetect from '../../libs/hooks/useDeviceDetect';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import { Stack, Box, Button, Pagination } from '@mui/material';
import { Menu, MenuItem } from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import AgentCard from '../../libs/components/common/AgentCard';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Member } from '../../libs/types/member/member';
import { useMutation, useQuery } from '@apollo/client';
import { LIKE_TARGET_MEMBER } from '../../apollo/user/mutation';
import { T } from '../../libs/types/common';
import { GET_AGENTS } from '../../apollo/user/query';
import { Message } from '@mui/icons-material';
import { Messages } from '../../libs/config';
import { sweetMixinErrorAlert, sweetTopSmallSuccessAlert } from '../../libs/sweetAlert';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common'])),
	},
});

const AgentList: NextPage = ({ initialInput, ...props }: any) => {
	const device = useDeviceDetect();
	const router = useRouter();
	const [anchorEl2, setAnchorEl2] = useState<null | HTMLElement>(null);
	const [filterSortName, setFilterSortName] = useState('Recent');
	const [sortingOpen, setSortingOpen] = useState(false);
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [searchFilter, setSearchFilter] = useState<any>(
		router?.query?.input ? JSON.parse(router?.query?.input as string) : initialInput,
	);
	const [agents, setAgents] = useState<Member[]>([]);
	const [total, setTotal] = useState<number>(0);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [searchText, setSearchText] = useState<string>('');

	/** APOLLO SO'ROVLAR **/
    const [likeTargetMember] = useMutation(LIKE_TARGET_MEMBER); 
    // GraphQL mutatsiyasi: a'zoni "like" qilish uchun
    
    const {
      loading: getAgentsLoading,   // Agentlar yuklanish jarayoni
      data: getAgentsData,         // Olingan agentlar ma'lumotlari
      error: getAgentsError,       // Xatolik bo'lsa
      refetch: getAgentsRefetch,   // Qayta so'rov yuborish
    } = useQuery(GET_AGENTS, {
      fetchPolicy: 'network-only',       // Faqat tarmoqdan ma'lumot olish
      variables: { input: searchFilter },// Qidiruv filtri bilan so'rov
      notifyOnNetworkStatusChange: true, // Tarmoq holati o'zgarsa xabar berish
      onCompleted: (data: T) => {
        setAgents(data?.getAgents?.list); // Agentlar ro'yxatini o'rnatish
        setTotal(data?.getAgents?.metaCounter[0]?.total); // Umumiy sonini o'rnatish
      },
    });



	/** LIFECYCLES **/
	useEffect(() => {
		if (router.query.input) {
			const input_obj = JSON.parse(router?.query?.input as string);
			setSearchFilter(input_obj);
		} else
			router.replace(`/agent?input=${JSON.stringify(searchFilter)}`, `/agent?input=${JSON.stringify(searchFilter)}`);

		setCurrentPage(searchFilter.page === undefined ? 1 : searchFilter.page);
	}, [router]);

	/** HANDLERS **/
	const sortingClickHandler = (e: MouseEvent<HTMLElement>) => {
		setAnchorEl(e.currentTarget);
		setSortingOpen(true);
	};

	const sortingCloseHandler = () => {
		setSortingOpen(false);
		setAnchorEl(null);
	};

	const sortingHandler = (e: React.MouseEvent<HTMLLIElement>) => {
		switch (e.currentTarget.id) {
			case 'recent':
				setSearchFilter({ ...searchFilter, sort: 'createdAt', direction: 'DESC' });
				setFilterSortName('Recent');
				break;
			case 'old':
				setSearchFilter({ ...searchFilter, sort: 'createdAt', direction: 'ASC' });
				setFilterSortName('Oldest order');
				break;
			case 'likes':
				setSearchFilter({ ...searchFilter, sort: 'memberLikes', direction: 'DESC' });
				setFilterSortName('Likes');
				break;
			case 'views':
				setSearchFilter({ ...searchFilter, sort: 'memberViews', direction: 'DESC' });
				setFilterSortName('Views');
				break;
		}
		setSortingOpen(false);
		setAnchorEl2(null);
	};

	const paginationChangeHandler = async (event: ChangeEvent<unknown>, value: number) => {
		searchFilter.page = value;
		await router.push(`/agent?input=${JSON.stringify(searchFilter)}`, `/agent?input=${JSON.stringify(searchFilter)}`, {
			scroll: false,
		});
		setCurrentPage(value);
	};

     
    	/** HANDLERLAR **/
    const LikeMemberHandler = async (user: any, id: string) => {
      try {
        if (!id) return; // Agar id bo'lmasa, funksiyani to'xtatish
        if (!user._id) throw new Error(Messages.error2); // Agar user._id bo'lmasa, xato chiqarish
    
        await likeTargetMember({
          variables: {
            input: id, // Mutatsiyaga id yuborish
          },
        });
    
        await getAgentsRefetch({ input: searchFilter }); // Agentlarni qayta so'rov qilish
        await sweetTopSmallSuccessAlert('success', 800); // Muvaffaqiyatli alert ko'rsatish
      } catch (err: any) {
        console.log('XATO, LikePropertyHandler:', err.message); // Konsolda xatoni chiqarish
        sweetMixinErrorAlert(err.message).then(); // Xato alert ko'rsatish
      }
    };



	if (device === 'mobile') {
		return <h1>AGENTS PAGE MOBILE</h1>;
	} else {
		return (
			<Stack className={'agent-list-page'}>
				<Stack className={'container'}>
					<Stack className={'filter'}>
						<Box component={'div'} className={'left'}>
							<input
								type="text"
								placeholder={'Search for an agent'}
								value={searchText}
								onChange={(e: any) => setSearchText(e.target.value)}
								onKeyDown={(event: any) => {
									if (event.key == 'Enter') {
										setSearchFilter({
											...searchFilter,
											search: { ...searchFilter.search, text: searchText },
										});
									}
								}}
							/>
						</Box>
						<Box component={'div'} className={'right'}>
							<span>Sort by</span>
							<div>
								<Button onClick={sortingClickHandler} endIcon={<KeyboardArrowDownRoundedIcon />}>
									{filterSortName}
								</Button>
								<Menu anchorEl={anchorEl} open={sortingOpen} onClose={sortingCloseHandler} sx={{ paddingTop: '5px' }}>
									<MenuItem onClick={sortingHandler} id={'recent'} disableRipple>
										Recent
									</MenuItem>
									<MenuItem onClick={sortingHandler} id={'old'} disableRipple>
										Oldest
									</MenuItem>
									<MenuItem onClick={sortingHandler} id={'likes'} disableRipple>
										Likes
									</MenuItem>
									<MenuItem onClick={sortingHandler} id={'views'} disableRipple>
										Views
									</MenuItem>
								</Menu>
							</div>
						</Box>
					</Stack>
					<Stack className={'card-wrap'}>
						{agents?.length === 0 ? (
							<div className={'no-data'}>
								<img src="/img/icons/icoAlert.svg" alt="" />
								<p>No Agents found!</p>
							</div>
						) : (
							agents.map((agent: Member) => {
								return <AgentCard agent={agent} key={agent._id}  likeMemberHandler={LikeMemberHandler}/>;
							})
						)}
					</Stack>
					<Stack className={'pagination'}>
						<Stack className="pagination-box">
							{agents.length !== 0 && Math.ceil(total / searchFilter.limit) > 1 && (
								<Stack className="pagination-box">
									<Pagination
										page={currentPage}
										count={Math.ceil(total / searchFilter.limit)}
										onChange={paginationChangeHandler}
										shape="circular"
										color="primary"
									/>
								</Stack>
							)}
						</Stack>

						{agents.length !== 0 && (
							<span>
								Total {total} agent{total > 1 ? 's' : ''} available
							</span>
						)}
					</Stack>
				</Stack>
			</Stack>
		);
	}
};

AgentList.defaultProps = {
	initialInput: {
		page: 1,
		limit: 10,
		sort: 'createdAt',
		direction: 'DESC',
		search: {},
	},
};

export default withLayoutBasic(AgentList);

